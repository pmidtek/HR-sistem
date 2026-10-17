import { describe, expect, it } from "vitest";
import { FOLDER as BACKEND_FOLDER } from "../../../../directus/access/folders";
import { ROLE as BACKEND_ROLE } from "../../../../directus/access/roles";
import { FOLDER, ROLE_ID, roleFromId } from "./ids";

describe("ID backend", () => {
  it("role sama dengan directus/access/roles.ts", () => {
    expect(ROLE_ID).toEqual(BACKEND_ROLE);
  });
  it("folder sama dengan directus/access/folders.ts", () => {
    expect(FOLDER).toEqual(BACKEND_FOLDER);
  });
  it("roleFromId", () => {
    expect(roleFromId(ROLE_ID.finance)).toBe("finance");
    expect(roleFromId("admin-role")).toBeNull();
  });
});
