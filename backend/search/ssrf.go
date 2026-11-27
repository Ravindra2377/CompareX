package search

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var (
	ErrInvalidScheme    = errors.New("only http and https schemes are permitted")
	ErrDisallowedHost   = errors.New("host is blocked for security")
	ErrPrivateIPBlocked = errors.New("access to private, loopback, or metadata IP addresses is prohibited (SSRF)")
)

// ValidateSafeURL checks that a URL is safe to fetch, blocking private/loopback/cloud metadata IPs.
func ValidateSafeURL(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return err
	}

	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return ErrInvalidScheme
	}

	hostname := parsed.Hostname()
	if hostname == "" {
		return ErrDisallowedHost
	}

	lowerHost := strings.ToLower(hostname)
	if lowerHost == "localhost" ||
		strings.HasSuffix(lowerHost, ".local") ||
		strings.HasSuffix(lowerHost, ".internal") ||
		lowerHost == "metadata.google.internal" {
		return ErrDisallowedHost
	}

	// Direct IP address string check
	if directIP := net.ParseIP(hostname); directIP != nil {
		if isDisallowedIP(directIP) {
			return ErrPrivateIPBlocked
		}
		return nil
	}

	// Resolve domain hostnames to IP addresses
	ips, err := net.LookupIP(hostname)
	if err != nil {
		return err
	}

	if len(ips) == 0 {
		return ErrDisallowedHost
	}

	for _, ip := range ips {
		if isDisallowedIP(ip) {
			return ErrPrivateIPBlocked
		}
	}

	return nil
}

func isDisallowedIP(ip net.IP) bool {
	if ip.IsLoopback() ||
		ip.IsPrivate() ||
		ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() ||
		ip.IsUnspecified() ||
		ip.IsInterfaceLocalMulticast() {
		return true
	}

	// Cloud metadata service (AWS/GCP/Azure/OpenStack)
	if ip.String() == "169.254.169.254" {
		return true
	}

	// Carrier-grade NAT (100.64.0.0/10)
	if ip4 := ip.To4(); ip4 != nil {
		if ip4[0] == 100 && ip4[1] >= 64 && ip4[1] <= 127 {
			return true
		}
		// 0.0.0.0/8
		if ip4[0] == 0 {
			return true
		}
	}

	return false
}

// NewSafeHTTPClient creates an http.Client with strict SSRF validation on the initial request AND on every redirect.
func NewSafeHTTPClient(timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout: timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return errors.New("stopped after 5 redirects")
			}
			return ValidateSafeURL(req.URL.String())
		},
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				host, port, err := net.SplitHostPort(addr)
				if err != nil {
					return nil, err
				}

				if directIP := net.ParseIP(host); directIP != nil {
					if isDisallowedIP(directIP) {
						return nil, fmt.Errorf("%w: %s", ErrPrivateIPBlocked, directIP)
					}
				} else {
					ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
					if err != nil {
						return nil, err
					}
					for _, ip := range ips {
						if isDisallowedIP(ip) {
							return nil, fmt.Errorf("%w: %s", ErrPrivateIPBlocked, ip)
						}
					}
					if len(ips) == 0 {
						return nil, ErrDisallowedHost
					}
					host = ips[0].String()
				}

				dialer := &net.Dialer{Timeout: 3 * time.Second}
				return dialer.DialContext(ctx, network, net.JoinHostPort(host, port))
			},
		},
	}
}
