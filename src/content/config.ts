import { defineCollection, z } from 'astro:content';

const projectSchema = z.object({
    name: z.string(),
    description: z.string().nonempty("Cannot have an empty project description"),
    shortDescription: z.optional(z.string().nonempty("Cannot have an empty project short description")),
    upstreamLink: z.string().url("Project upstream link must be a valid URL"),
    previewImage: z.optional(z.string()),
    deployment: z.optional(z.object({
        url: z.string().url("Project deployment URL must be a valid URL"),
    })),
    academicData: z.optional(z.object({
        course: z.object({
            code: z.string(),
            fullName: z.string(),
            year: z.string().regex(/20\d{2}/, "Year must be a valid year"),
            semester: z.literal(1).or(z.literal(2)),
        }),
        marks: z.optional(z.number().gte(0).lte(20)),
    })),
    techStack: z.optional(z.union([
        z.object({
            frontend: z.array(z.string()),
            backend: z.array(z.string()),
        }),
        z.array(z.string()),
    ])),
    otherMembers: z.optional(z.array(z.object({
        name: z.string(),
        githubUrl: z.string().url().regex(/github.com\//, "Other members' link must be a valid GitHub profile link"),
    }))),
})

const projectCollection = defineCollection({
    type: "content",
    schema: projectSchema,
});

export type Project = z.infer<typeof projectSchema>;

export const collections = {
    'project': projectCollection,
};