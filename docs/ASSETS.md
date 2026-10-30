# Photograph → browser asset

## Three-hour reference session

1. One hour: Koteshwor–Balkumari junctions, road edges, signs, building heights, and overall street rhythm. Record where each photograph was taken and the viewing direction.
2. One hour: a single accessible temple/shrine. Capture the whole subject in front, back, and side views plus diagonal angles. Keep distance, lighting, and exposure consistent. Photograph roof layers and carved details separately. Avoid occluded views when possible.
3. One hour: building fronts, shutters, brickwork, balconies, rooftop tanks, and shop signs. Prefer straight-on views for facade textures.

Keep original photos. Organize by subject, e.g. `references/balkumari-shrine/front.jpg`, and add notes on approximate height. Reference photos alone are not automatically game-ready textures or meshes. A single-image model invents hidden surfaces; multiple views help but do not guarantee reconstruction accuracy.

For a later photogrammetry experiment, capture a continuous sequence of sharp overlapping views around the subject, with extra coverage for roofs and occluded details. A few separated reference photographs are not a photogrammetry scan.

## Two-hour landmark experiment

Use Meshy Image to 3D first, or Tripo's multiview workflow if more suitable. Use one isolated subject, not an entire street. Inspect available export and usage rights before spending money; this project assumes no paid subscription. Export GLB.

- 0–30 minutes: select/crop references and try one generation.
- 30–60: inspect silhouette, roof tiers, holes, unseen sides, texture seams, and generated text.
- 60–90: use the provider's reduction/export tools to produce a lightweight GLB; target approximately 20k triangles, 1–2k textures and under 5 MB for the first landmark.
- 90–120: import, check scale/orientation, drive around it, and compare frame time and download size. Keep the geometric placeholder if it fails.

These are working budgets, not guarantees. Do not put raw high-resolution scans into the game. Signs and lettering should remain authored textures, rather than trusting generated lettering.

## Import contract

Place a reviewed model at `public/assets/landmark.glb`. Add an entry to `landmarks` in `src/assets.ts`:

```ts
{
  url: '/assets/landmark.glb',
  position: [100, 0, -60],
  scale: 1,
  yaw: 0,
  colliderHalfExtents: [7.5, 5, 7],
  colliderOffset: [0, 5, 0],
}
```

One world unit is one meter. Y points up. Yaw is radians about Y. Collider dimensions and offsets are in world meters and are deliberately independent of the visual scale. Center/bottom-align the asset before specifying these values. Use coarse colliders rather than a detailed triangle mesh.

Remove the matching procedural temple and its collider from `createWorld` when replacing it; do not stack both at the same location. Keep an asset ledger recording the source photographs, generation service, export date, usage terms, file size and optimization steps. Loading failures leave the rest of the game playable and show a message.

Reference tools:
- https://help.meshy.ai/en/articles/9996860-how-to-use-meshy-image-to-3d
- https://www.tripo3d.ai/product-doc/support/faq
- https://www.agisoft.com/pdf/metashape_2_1_en.pdf
