# Instagram Studio — Attraction & Event Carousel Generator

**Date:** 2026-07-08  
**Status:** Approved design, pending implementation plan

## Goal

Extend Instagram Studio's **Atraksi & Event** tool so an admin can enter a
topic such as “Songkran Bangkok 2026,” upload several photos, and generate an
editable four- or five-slide Instagram carousel. The carousel teaches and
entertains first, then ends with a Keliling Thailand transportation offer using
real vehicle data, prices, and images already maintained by the project.

## Users and context

Keliling Thailand's internal admin team creates social content from desktop and
mobile admin views. The workflow must be fast, explicit, and safe to edit. It
must preserve the existing navy/yellow admin identity and the current
Instagram Studio patterns.

## Scope

In scope:

- Generate a complete four- or five-slide carousel from one topic.
- Upload several attraction/event photos before or after generation.
- Produce Indonesian carousel copy with a structured story arc.
- Edit or regenerate the whole carousel or one slide at a time.
- Add, duplicate, reorder, and remove slides.
- Assign or replace the image used by each slide.
- Build a transportation advertisement slide from existing vehicle catalog
  data, current prices, and landing-page vehicle assets.
- Select which vehicle choices appear on the transport slide.
- Export one slide as PNG, download slides individually, or download the full
  carousel as a ZIP.
- Save generated slide URLs and the editable source payload to the existing
  social post gallery.

Out of scope:

- AI-generated event images.
- Web image search or automatic third-party image licensing.
- AI-generated vehicle names, prices, or transport claims.
- Direct publishing to Instagram.
- Video or animated carousel export.

## Generation model

Use a **structured AI generator**, not a fully freeform sequence. AI returns
validated slide content with explicit slide roles. This keeps the story varied
while making the sales ending predictable and ensuring business data never
comes from the model.

The initial result contains four or five slides total, including the transport
advertisement:

1. **Hook:** topic introduction, strong opening, and a prompt to swipe.
2. **Story/fact:** a fun fact explained as a short story.
3. **Story/fact:** a second distinct fact, tradition, or useful context.
4. **Optional value slide:** a practical tip, event highlight, etiquette note,
   or itinerary idea. In a four-slide result, this value is folded into one of
   the middle slides.
5. **Transport offer:** Keliling Thailand vehicle choices, catalog prices, and
   a concise contact CTA.

The transport offer is always the final slide in the initial generation. After
generation it behaves like any other slide: the admin may move or remove it.
Removing it requires a confirmation warning because it removes the primary
sales CTA.

## Editor experience

The existing `AttractionEditor` becomes a carousel editor with three working
areas:

- **Setup panel:** topic, optional location/date context, multi-photo uploader,
  format, and Generate Carousel action.
- **Slide rail:** ordered slide thumbnails with select, add, duplicate, move,
  remove, and per-slide regenerate actions.
- **Live preview/editor:** the selected slide's rendered Instagram canvas plus
  editable title, body, CTA, slide type, and assigned photo.

On narrow screens these areas stack without removing controls. The selected
slide remains explicit, and save/export actions remain reachable.

AI assigns uploaded photos across appropriate informational slides. The admin
can reassign any uploaded photo or upload another one. A newly added slide has
an editable title and body, an optional CTA, a selectable type, and a photo
slot. Duplicate creates an independent copy with a new stable ID.

The admin can:

- Regenerate all copy, which replaces generated copy after confirmation.
- Regenerate only the selected slide, preserving every other slide and all
  manual edits outside that slide.
- Add a slide at the current position.
- Duplicate, reorder, or remove any slide.
- Restore a transport slide by adding a slide with the transport type.

## Transport data

The transport slide is composed locally after AI content generation. It does
not accept vehicle facts or prices from the AI response.

Vehicle options come from the project's existing Price List data. Vehicle
images resolve through a deterministic mapping to the assets used by the
public landing/fleet pages under `public/vehicles/`. The editor preselects
suitable active options when possible, while allowing the admin to choose the
vehicles displayed.

Each displayed option contains:

- Vehicle/catalog name.
- Existing public-facing price and its applicable unit/label.
- Existing vehicle image.

Missing images or incomplete prices are shown as explicit catalog warnings and
are excluded from export until corrected or deselected. No fallback value is
invented.

## Data model

The attraction post changes from a single canvas to an ordered carousel:

```ts
type AttractionSlideType =
  | "hook"
  | "fact"
  | "tip"
  | "custom"
  | "transport";

interface AttractionCarouselSlide {
  id: string;
  type: AttractionSlideType;
  title: string;
  body: string;
  cta: string;
  photoId: string | null;
  vehicleIds: string[];
}

interface AttractionCarouselData {
  topic: string;
  location: string;
  date: string;
  photos: Array<{ id: string; localUrl: string; publicUrl: string | null }>;
  slides: AttractionCarouselSlide[];
  logoUrl: string | null;
  brandColors: BrandColors;
}
```

Vehicle IDs are references only. Current vehicle presentation data is resolved
from the catalog at render/export time so AI and saved payloads are not treated
as a pricing authority.

The existing `social_posts` row remains the gallery record:

- `kind` remains `attraction`.
- `image_url` stores the first exported slide for gallery compatibility.
- `payload.slideUrls` stores all exported slide URLs in order.
- `payload.carousel` stores the editable attraction carousel source.
- `template` stores the selected carousel style.
- `format` stores the common output format.

## AI contract

Add a dedicated attraction-carousel generation route. It accepts topic,
optional location/date, requested slide count, and existing slide context for
single-slide regeneration. It returns structured JSON containing only
editorial fields:

- Slide role.
- Title.
- Body.
- Optional CTA.
- Suggested photo index where relevant.

The server validates the response before returning it to the editor:

- Initial generation contains four or five total slides.
- Exactly one initial transport role exists and is last.
- Titles and bodies respect defined length limits suitable for the canvas.
- Middle slides are meaningfully distinct.
- Copy is Indonesian and does not invent dates, prices, opening hours, or other
  unsupported operational facts.

The server may repair a malformed model response once. If validation still
fails, it returns a clear error and leaves the current editor state unchanged.

## Rendering and templates

Carousel slides share one cohesive visual style and common format. Each slide
role has a purpose-built layout rather than forcing all content into one card:

- Hook prioritizes the event image and headline.
- Fact/story slides prioritize short readable copy and visual sequence markers.
- Tip/custom slides support flexible editorial content.
- Transport uses a compact vehicle comparison layout with catalog images and
  prices.

The initial implementation extends the current attraction template registry
with carousel-aware role templates. It preserves the existing format sizes:
4:5, 1:1, and 9:16.

## Export and gallery flow

1. Validate slide copy, photo assignments, and selected vehicle records.
2. Render each slide at the selected output dimensions.
3. Upload every PNG in slide order.
4. Save one `social_posts` record only after all uploads succeed.
5. Offer:
   - Download selected slide as PNG.
   - Download each slide separately.
   - Download all slides as a consistently named ZIP.

File names use a sanitized topic and ordered slide number, for example
`songkran-bangkok-01.png`. The ZIP uses the topic plus `carousel`.

The gallery shows the first slide as its cover and displays the slide count.
Opening the gallery item exposes all slide previews, individual downloads, and
the full ZIP download.

## Error handling and safeguards

- Generation errors never clear existing slides or manual edits.
- Whole-carousel regeneration requires confirmation when edited content exists.
- Single-slide regeneration changes only that slide's editorial fields.
- Deleting the transport slide requires confirmation.
- Export is blocked when there are no slides, required copy overflows, an
  informational slide lacks a photo, or a selected vehicle lacks usable catalog
  data.
- Photo upload failures identify the affected photo and retain successful
  uploads.
- Partial export uploads do not create a gallery row. The UI reports the failed
  slide so the admin can retry.
- ZIP creation failure does not invalidate already saved PNG exports.

## Testing

Pure unit tests cover:

- Carousel prompt construction.
- AI response parsing and validation.
- Four- and five-slide initial sequences.
- Add, duplicate, reorder, and remove operations with stable IDs.
- Single-slide regeneration merge behavior.
- Transport slide deletion warning state.
- Vehicle catalog/image mapping without invented fallbacks.
- Export and ZIP file naming.

Browser verification covers:

- Generate from a topic with several uploaded photos.
- Edit and regenerate one slide without changing the others.
- Add, duplicate, reorder, and remove slides.
- Remove and restore the transport slide.
- Select vehicle options and verify current images/prices in the preview.
- Export a selected PNG, all individual PNGs, and the ZIP.
- Reopen a saved carousel from the gallery and download its slides.
- Repeat core operations at a narrow mobile viewport.

## Relevant existing files

- `components/admin/instagram/AttractionEditor.tsx`
- `components/admin/instagram/templates/attraction.tsx`
- `components/admin/views/marketing/InstagramStudioView.tsx`
- `lib/admin/instagram.ts`
- `lib/admin/socialPosts.ts`
- `lib/admin/priceBook.ts`
- `public/vehicles/`
- `app/api/instagram/caption/route.ts`
