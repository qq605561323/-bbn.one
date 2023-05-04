import * as zod from "https://deno.land/x/zod@v3.21.4/mod.ts";

const DATE_PATTERN = /\d\d\d\d-\d\d-\d\d/;
export const userString = zod.string().min(1).refine(x => x.trim()).transform(x => x.trim());

export enum DropType {
    Published = 'PUBLISHED', // Uploaded, Approved
    Publishing = 'PUBLISHING', // Uploading
    Private = 'PRIVATE', // Declined, can be resubmitted
    UnderReview = 'UNDER_REVIEW',
    Unsubmitted = 'UNSUBMITTED', // Draft
    ReviewDeclined = "REVIEW_DECLINED" // Rejected, cant be resubmitted
    /*
        1: Drafts - Not on Store
            - Draft: Submit (No Fields locked, submitted => Under Review)
            - Under Review (Drafts): Cancel (Reviewers can approve or decline with a reason, declined => Draft with Reason, approved => Publishing, Cancel => Draft)
            - Publishing (Drafts): Take Down Request (Backend is uploading the files and waits for Batch Delivery to complete and sets type to Published, Take Down Request => Takedown Pending)
        2: On Store
            - Revision: Submit (Some fields are locked, Show Changes to Reviewer, submitted => Under Review)
            - Under Review (Revisions): Cancel (Reviewers can approve or decline with a reason, declined => Draft with Reason, approved => Publishing, Cancel => Revision)
            - Publishing (Revisions): Take Down Request (Backend is uploading the files and waits for Batch Delivery to complete and sets type to Published, Take Down Request => Takedown Pending)
            - Published: Take Down Request, Edit (Take Down Request => Takedown Pending, Edit => Revision)
        3: Takendowns
            - Takedown Review: Cancel (Cancel => Published) (On Store Label)
            - Takedown Pending: None (On Store Label)
            - Takedowns: None
        History:
            When in Editing Mode, changes are saved to other object,
                when approved or declined, the changes are pushed into history array,
                when approved, the changes are applied to the main object
    */
}

export enum DataHints {
    InvalidData = "INVALID_DATA",
    DeadLinks = "DEAD_LINKS"
}

export enum ArtistTypes {
    Primary = "PRIMARY",
    Featuring = "FEATURING",
    Songwriter = "SONGWRITER",
    Producer = "PRODUCER"
}

export enum ReviewResponse {
    Approved = "APPROVED",
    DeclineCopyright = "DECLINE_COPYRIGHT",
    DeclineMaliciousActivity = "DECLINE_MALICIOUS_ACTIVITY"
}

export const artist = zod.tuple([
    userString,
    zod.string(),
    zod.nativeEnum(ArtistTypes)
]);

export const song = zod.object({
    id: zod.string(),
    dataHints: zod.nativeEnum(DataHints).optional(),
    isrc: zod.string().optional(),
    title: userString,
    artists: artist.array().min(1),
    primaryGenre: zod.string(),
    secondaryGenre: zod.string(),
    year: zod.number(),
    //TODO: no optional
    country: zod.string().optional(),
    language: zod.string().optional(),
    explicit: zod.boolean(),
    instrumental: zod.boolean().optional(),
    file: zod.string({ required_error: "a Song is missing its file." }),
    progress: zod.number().optional().transform(x => <typeof x>undefined)
});

export const pageOne = zod.object({
    upc: zod.string().nullish()
        .transform(x => x?.trim())
        .transform(x => x?.length == 0 ? null : x)
        .refine(x => x == null || x.length > 0, { message: "Not a valid UPC" })
});

export const pageTwo = zod.object({
    title: userString,
    artists: artist.array().min(1),
    release: zod.string().regex(DATE_PATTERN, { message: "Not a date" }),
    language: zod.string(),
    primaryGenre: zod.string(),
    secondaryGenre: zod.string()
});

export const pageThree = zod.object({
    compositionCopyright: userString,
    soundRecordingCopyright: userString
});

export const pageFour = zod.object({
    loading: zod.literal(false, { description: "Upload still in progress" }).transform(_ => undefined),
    artwork: zod.string()
});

export const pageFive = zod.object({
    uploadingSongs: zod.array(zod.string()).max(0, { message: "Some uploads are still in progress" }).transform(_ => undefined),
    songs: song.array().min(1)
});

export const pageSix = zod.object({
    comments: userString.optional()
});

export const pureDrop = pageOne
    .merge(pageTwo)
    .merge(pageThree)
    .merge(pageFour)
    .merge(pageFive)
    .merge(pageSix);

export const drop = pureDrop
    .merge(zod.object({
        _id: zod.string(),
        lastChanged: zod.number().describe("unix timestamp").optional(),
        user: zod.string(),
        dataHints: zod.nativeEnum(DataHints).optional(),
        type: zod.nativeEnum(DropType).optional(),
        reviewResponse: zod.nativeEnum(ReviewResponse).optional()
    }));

export const payout = zod.object({
    _id: zod.string(),
    importer: zod.string(),
    file: zod.string(),
    period: zod.string(),
    moneythisperiod: zod.string(),
    entries: zod.object({
        isrc: zod.string(),
        user: zod.string().optional(),
        data: zod.array(
            zod.object({
                distributor: zod.string(),
                territory: zod.string(),
                quantity: zod.number(),
                revenue: zod.string()
            })
        )
    }).array()
});

export const oauthapp = zod.object({
    _id: zod.string(),
    name: zod.string().min(3).max(32),
    redirect: zod.string().url(),
    secret: zod.string().min(32).max(64),
    icon: zod.string().url(),
});

export const file = zod.object({
    _id: zod.string(),
    length: zod.number(),
    chunkSize: zod.number(),
    uploadDate: zod.string(),
    metadata: zod.object({
        filename: zod.string(),
        type: zod.string(),
    })
});

enum PaymentType {
    "RESTRAINT", // cannot be withdrawn (when adding funds to account)
    "UNRESTRAINT" // can be withdrawn
}

export const paymentmethod = zod.object({
    _id: zod.string(),
    name: zod.string(),
    transactions: zod.object({
        amount: zod.number(),
        timestamp: zod.string(),
        type: zod.nativeEnum(PaymentType),
        description: zod.string(),
        source: zod.string(),
        counterParty: zod.string()
    }).array(),
/*     providerdata: zod.object({

    }) */
});

export type Drop = zod.infer<typeof drop>;
export type PureDrop = zod.infer<typeof pureDrop>;
export type Artist = zod.infer<typeof artist>;
export type Song = zod.infer<typeof song>;
export type Payout = zod.infer<typeof payout>;
export type OAuthApp = zod.infer<typeof oauthapp>;
export type File = zod.infer<typeof file>;
export type PaymentMethod = zod.infer<typeof paymentmethod>;