import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe";

const schema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
});

describe("ZodValidationPipe", () => {
  it("returns the parsed value when validation succeeds", () => {
    const pipe = new ZodValidationPipe(schema);
    const input = { email: "a@b.com", displayName: "A" };

    expect(pipe.transform(input)).toEqual(input);
  });

  it("throws BadRequestException with the Zod issues when validation fails", () => {
    const pipe = new ZodValidationPipe(schema);

    try {
      pipe.transform({ email: "not-an-email", displayName: "" });
      expect.unreachable("transform should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        message: unknown;
      };
      expect(Array.isArray(response.message)).toBe(true);
      expect((response.message as unknown[]).length).toBeGreaterThan(0);
    }
  });
});
