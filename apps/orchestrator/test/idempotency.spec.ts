import { makeIdempotencyKey } from "../src/common/utils/idempotency";

describe("idempotency", () => {
  it("is stable for same input", () => {
    expect(makeIdempotencyKey("hello")).toBe(makeIdempotencyKey("hello"));
  });
});
