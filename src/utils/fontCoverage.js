export function needsFullFont(text, characters, unavailable = new Set()) {
  return [...text].some(character => !/\s/u.test(character) && !characters.has(character) && !unavailable.has(character));
}
