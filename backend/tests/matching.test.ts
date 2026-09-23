import { describe, expect, it } from "vitest";
import { scoreMatch } from "../src/lib/matching.js";

const lost = {
  id: "lost-1",
  reporterUserId: "user-1",
  itemTitle: "Black Dell Latitude Laptop",
  category: "Electronics",
  color: "Black",
  brand: "Dell",
  description: "Dell laptop with a small sticker near the trackpad",
  locationLost: "Engineering Library",
  dateLost: new Date("2026-09-20"),
};

describe("scoreMatch", () => {
  it("scores a strong likely match highly", () => {
    const result = scoreMatch(lost, {
      id: "found-1",
      itemTitle: "Dell Latitude black laptop",
      category: "Electronics",
      color: "black",
      brand: "Dell",
      description: "Laptop with sticker beside trackpad",
      locationFound: "Engineering Library entrance",
      dateFound: new Date("2026-09-20"),
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("keeps unrelated items below the candidate threshold", () => {
    const result = scoreMatch(lost, {
      id: "found-2",
      itemTitle: "Blue water bottle",
      category: "Other",
      color: "Blue",
      brand: null,
      description: "Plastic bottle",
      locationFound: "Football pitch",
      dateFound: new Date("2026-09-01"),
    });

    expect(result.score).toBeLessThan(30);
  });
});
