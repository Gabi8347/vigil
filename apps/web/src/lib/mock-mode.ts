/** Development starts with fixtures. Set NEXT_PUBLIC_VIGIL_MOCK_API=0 to use the local API. */
export const mockApiEnabled = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_VIGIL_MOCK_API !== "0";

export const mockApiPath = "/api/mock";
