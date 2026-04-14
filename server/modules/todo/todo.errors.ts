export class TodoServiceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "TodoServiceError";
  }
}
