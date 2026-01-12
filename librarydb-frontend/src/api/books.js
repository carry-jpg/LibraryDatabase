import { currentStock } from "../fakeData";

export async function getBooks() {
  return Promise.resolve(currentStock);
}
