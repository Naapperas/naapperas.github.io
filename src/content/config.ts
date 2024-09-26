import { defineCollection, z, type ImageFunction } from 'astro:content';

import { icons } from '../components/Icons/index.astro';

const [firstTag, ...tags] = Object.keys(icons) as (keyof typeof icons)[]
const techSchema = z.enum([firstTag, ...tags]);

export type Tech = z.infer<typeof techSchema>;

const projectSchema = (image: ImageFunction) => z.object({
    name: z.string(),
    description: z.string().min(1, "Cannot have an empty project description"),
    shortDescription: z.string().min(1, "Cannot have an empty project short description").optional(),
    upstreamLink: z.string().url("Project upstream link must be a valid URL"),
    previewImage: image().optional(),
    deployment: z.object({
        url: z.string().url("Project deployment URL must be a valid URL"),
    }).optional(),
    academicData: z.object({
        course: z.object({
            code: z.string(),
            fullName: z.string(),
            year: z.string().regex(/20\d{2}/, "Year must be a valid year"),
            semester: z.literal(1).or(z.literal(2)),
        }),
        marks: z.number().gte(0).lte(20).optional(),
    }).optional(),
    techStack: z.object({
        frontend: z.array(techSchema),
        backend: z.array(techSchema),
    }).or(
        z.array(techSchema),
    ).optional(),
    otherMembers: z.object({
        name: z.string(),
        githubUrl: z.string().url().regex(/github.com\//, "Other members' link must be a valid GitHub profile link").optional(),
    }).array().optional(),
})

const mapLocationSchema = (image: ImageFunction) => z.object({
    name: z.string(),
    tooltip: z.object({
        
    })
});

const projectCollection = defineCollection({
    type: "content",
    schema: ({ image }) => projectSchema(image),
});

const mapLocationCollection = defineCollection({
    type: "content",
    schema: ({ image }) => mapLocationSchema(image),
});


export type Project = z.infer<ReturnType<typeof projectSchema>>;
export type MapLocation = z.infer<ReturnType<typeof mapLocationSchema>>;

export const collections = {
    'project': projectCollection,
    'mapLocation': mapLocationCollection
};