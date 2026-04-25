/**
 * Normalize a string into a URL slug (lowercase, hyphenated).
 */
export function slugify(input: string): string {
	const s = input
		.trim()
		.toLowerCase()
		.replace(/['"]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return s.length > 0 ? s : "post";
}

export function slugFromTitle(title: string): string {
	return slugify(title);
}
