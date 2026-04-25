import { z } from "zod";

const seoSchema = z
	.object({
		title: z.string().nullable().optional(),
		description: z.string().nullable().optional(),
		image: z.string().nullable().optional(),
		canonical: z.string().nullable().optional(),
		noIndex: z.boolean().optional(),
	})
	.strict();

export const frontmatterSchema = z
	.object({
		title: z.string().min(1),
		slug: z.string().min(1).optional(),
		excerpt: z.string().optional(),
		collection: z.string().min(1).default("posts"),
		status: z.literal("draft").optional(),
		tags: z.array(z.string()).optional(),
		category: z.union([z.string(), z.array(z.string())]).optional(),
		seo: seoSchema.optional(),
	})
	.strict()
	.superRefine((data, ctx) => {
		if (data.status != null && data.status !== "draft") {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Only status: "draft" is allowed for ingest',
				path: ["status"],
			});
		}
		if (data.collection !== "posts") {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'collection must be "posts" in v1',
				path: ["collection"],
			});
		}
	});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

export const jsonIngestBodySchema = z
	.object({
		markdown: z.string().min(1),
	})
	.strict();

export type JsonIngestBody = z.infer<typeof jsonIngestBodySchema>;
