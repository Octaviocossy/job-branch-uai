/** Raised when a branch references a CvVersion name that doesn't exist for the current user. */
export class CvVersionNotFoundError extends Error {
  constructor(name: string) {
    super(`CV version "${name}" not found for the current user`);
    this.name = "CvVersionNotFoundError";
  }
}
