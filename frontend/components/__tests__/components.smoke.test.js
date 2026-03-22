import ProductCard from "../ProductCard";
import PlatformRow from "../PlatformRow";
import SearchBar from "../SearchBar";
import SkeletonLoader from "../SkeletonLoader";
import PerformanceDebugPanel from "../PerformanceDebugPanel";
import {
  SurfaceCard,
  AppButton,
  TextField,
  ScreenHeader,
  Badge,
  PriceTag,
  RatingRow,
  SectionHeader,
} from "../SharedUI";

describe("Component module exports", () => {
  it("default components are defined", () => {
    expect(ProductCard).toBeDefined();
    expect(PlatformRow).toBeDefined();
    expect(SearchBar).toBeDefined();
    expect(SkeletonLoader).toBeDefined();
    expect(PerformanceDebugPanel).toBeDefined();
  });

  it("shared UI named exports are defined", () => {
    expect(SurfaceCard).toBeDefined();
    expect(AppButton).toBeDefined();
    expect(TextField).toBeDefined();
    expect(ScreenHeader).toBeDefined();
    expect(Badge).toBeDefined();
    expect(PriceTag).toBeDefined();
    expect(RatingRow).toBeDefined();
    expect(SectionHeader).toBeDefined();
  });
});
