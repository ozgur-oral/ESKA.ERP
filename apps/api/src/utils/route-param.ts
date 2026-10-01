export function routeParam(
  value: string | string[] | undefined
): string {
  if (typeof value !== "string") {
    throw new Error("Geçersiz URL parametresi.");
  }

  return value;
}