export class UnknownErrorWithCause extends Error {
  constructor(cause: unknown) {
    let stringifiedCause = "unknown";

    try {
      stringifiedCause = JSON.stringify(cause);
    } catch {
      try {
        stringifiedCause = (cause as any).toString();
      } catch {}
    }
    super(stringifiedCause);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, UnknownErrorWithCause.prototype);
  }

  public static from = (cause: unknown) => new UnknownErrorWithCause(cause);
}
