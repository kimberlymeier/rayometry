# RAYometry

Open **index.html** in a browser. No installation, server, internet connection, or build is needed. Keep the files together when moving the app. Nothing is uploaded or saved between sessions.

## Using the bench

- Drag the source or block to move it. Drag the incident ray to rotate the source, or select an item and drag its circular handle. You can also enter a board orientation (0° right, positive clockwise).
- Reset starts with a source inside glass: its ray hits the top at 50°, reflects internally, then exits a side face.
- Rotate the source to explore the critical angle. Drag it outside the glass to explore entry and exit refraction.
- Select one, three, or five parallel rays. For five rays, the middle ray supplies the live first-surface annotations.
- To rotate around an entry point, select **Surface entry point**. The middle ray’s first intersection becomes the pivot automatically. The source moves around that pivot and stays aimed at it. Rotation stops before the point would cease to be its first hit. Dragging the source keeps its direction fixed and updates the pivot to the new first intersection. Moving/rotating the block also updates the pivot. Only the dropdown (or Reset) changes the rotation mode. If the ray misses the block, reposition it to establish a pivot before rotating. The ray and white handle behave the same in both modes; only the center of rotation changes.
- Change both refractive indices in Media. Values must be finite and greater than zero.
- **Inspect** freezes editing. Click any marked intersection to see its normal, angles, and indices. **Edit** restores movement. Normal and angle switches control live annotations; Inspect always reveals both for the chosen interaction.
- All optical angles are measured from the normal. `i` is incidence, `t` is transmission/refraction, and `r` is reflection. These differ from the board orientation control.
- Reset restores the entire original scene.

## Exploring triangular prisms

1. Under **Optical element**, choose **45°–45°–90° prism**. Its upper corner is labeled **45° apex**; the preset aims the source at the midpoint of the vertical left face.
2. Set surroundings to **1.00** and prism to **1.49** for plastic or **1.523** for glass. Select **1 ray**.
3. Select the ray source and choose **Surface entry point** so each trial uses the same entry point.
4. With the prism in its preset orientation, set source board orientation to **−10°, −20°, −30°, −40°, −50°**. These correspond to **10°, 20°, 30°, 40°, 50° incidence** at the left face. This shortcut applies only while the prism stays unrotated.
5. Use **Inspect** and click the second intersection to read the emergent angle. **Total deviation · δ** is the angle between the original incident direction and final emerging direction, shown for the middle ray's direct two-surface path. Return to **Edit** for the next trial.
6. Set source orientation to **0°** to investigate normal entry and TIR at the next face. The subsequent reflection and exit are traced too; there is no direct two-surface deviation readout for this path.
7. Starting near normal entry, drag the incident ray toward a slightly negative source orientation to locate the critical condition at the second face. It gently snaps, the grazing ray darkens, and the critical angle is highlighted. Inspect that second intersection for its values.
8. Explore minimum deviation by varying incidence with the surface pivot fixed. At the minimum, incident and emergent angles are equal.

Also available: **30°–60°–90°** and **equilateral** triangle presets. Corner labels identify their geometry. Reset still returns to the original rectangular-block TIR demonstration.

The Risley prism, retinal/apparent image demonstrations, graphing, and saved configurations are not implemented yet.

## Small architecture

- `physics.js`: pure vectors, polygon and exact semicircle boundary intersections, vector Snell law, and path tracing. Angles are radians, coordinates are board units with y downward. It exposes `Optics`; no DOM dependencies.
- `scene.js`: shape presets, defaults, ray-bundle creation, deviation readouts, critical-angle snapping, and pivot constraints. It exposes `BenchScene`.
- `measurements.js`: physical scale, ruler snapping, radius input conversion, and internal-ray extensions, separate from ray tracing.
- `app.js`: SVG rendering and pointer/form interactions. `index.html` and `styles.css` provide the interface.

Ordinary scripts work with local file URLs and static hosting. No hosting setup is included.

## Verification

Open **tests.html**, or run `node tests.js` if Node is installed. The same physics code is tested in both environments. `node tests-controls.cjs` checks control handlers with a small DOM fixture; it does not replace visual browser testing.

## Deliberate limits

One solid object (rectangle, triangular prism, or semicircle preset) and one source. Choosing another preset replaces that object and aims the source at it; indices and rotation mode are preserved. The semicircle starts with three rays; other presets retain your ray count. Only the transmitted branch is drawn below the critical angle; at TIR only reflection is drawn. A critical-angle ray follows the tangent to the workspace edge. Corner hits and sources exactly on boundaries require repositioning. Trapped paths stop after 20 interactions with a visible message. The physical bench scale is 0.2 mm per board unit (200 × 130 mm overall). No intensity, wave optics, image formation, other curved shapes, thin elements, or multiple simultaneous objects are modeled yet.

When dragging the source ray or handle, rotation gently snaps when a source-angle adjustment of at most 0.35° reaches a critical interaction on the middle ray’s path, including a prism’s exit face. Continue dragging to leave the snap. The grazing exit ray darkens and the angle is highlighted as θc. Numerical orientation entry stays exact and does not snap.

Triangular prisms also gently snap within 0.35° of minimum deviation during source-ray/handle dragging, in either pivot mode. A highlighted δmin readout marks equal incidence and emergence for direct two-face transmission through a prism denser than its surroundings. Continue dragging to release; numeric angles do not snap. Rectangular blocks have no minimum-deviation snap.

Use **Minimum deviation** or **Critical angle** in the properties panel to jump to the exact condition. Both buttons keep the middle ray’s current first entry point fixed and preserve the manual rotation dropdown. Critical angle targets the first higher-to-lower index transition on the current path (usually the second face for an external prism source). If the condition cannot be reached on the current faces within the board, the scene is left unchanged and a message explains why.

In **Inspect**, choose **Show all angles** to reveal angles and normals at every traced interaction, for all rays. Click an intersection to keep updating its sidebar readout. **Show selected only** restores the focused view. Returning to Edit restores your original annotation toggles.

The **Deviation δ** checkbox draws an angle arc at the middle ray’s exit point. Its dashed purple reference is parallel to the original incoming ray, so δ measures total change in direction, not an angle to the surface normal. It works in Edit and Inspect for direct two-surface transmitted paths; at minimum deviation the label reads δmin.

## Exploring a curved block

Choose **Optical element → Semicircular block**. Three parallel rays enter the flat face normally and converge after leaving the curved face. Set the material to **1.49** for plastic or **1.53** for glass. **C** marks the circle's center and **A** its curved vertex; the dotted line is the optical axis.

Select the semicircle and enter **180°** orientation to put the curved face toward the source. Refraction occurs at both boundaries, including the flat exit. In Inspect, **Show all angles** shows the curved-surface normals along the radii. The boundary uses an exact circle, not polygon facets.

Internal-ray extensions and millimeter measurements are available under Measure & explore. Automatic dioptric-power calculations and a lens clock are not implemented. Do not use the final emerging-ray crossing as the isolated curved surface's secondary focus: the flat exit has refracted those rays again.

Select the curved block in Edit mode and drag the **gold diamond** at its vertex. Moving inward flattens the circular face (larger radius); moving outward rounds it back to a semicircle (smaller radius). The flat face retains its height and position. Curve depth ranges from one fifth of the half-height to the full half-height. The radius shown in properties is in millimeters and can be entered exactly (30–78 mm). Refraction, normals, center of curvature, and bounds update with the true circular geometry; selecting the semicircle preset restores the original curve. Inspect hides the shaping handle.

## Distance and focal-point exploration

- **Dot grid** toggles dots spaced **5 mm** apart. The **20 mm** scale bar remains visible, independent of browser zoom or window size.
- Select a curved block to enter its **Radius** in millimeters. This changes curvature while keeping the flat face 60 mm high, matching the gold-handle adjustment. Its unsigned radius ranges from 30 mm (semicircle) to 78 mm (flatter cap).
- Use the **Ruler** button at the upper-left of the bench. Drag either endpoint to measure; drag the ruler's middle to translate it without changing length. It remains usable in **Inspect**, where optical elements stay locked.
- **Snap ruler to points** snaps near A, C, surface hits, and visible ray crossings. With internal extensions enabled, their crossings are also available. Snapping happens while dragging an endpoint; the ruler does not follow elements when they move.
- **Extend internal rays** works for curved-face-first transmission through a curved block's flat exit. Blue dashed lines continue the internal direction without applying the exit refraction. The solid rays still show the real two-surface path.
- To locate a secondary focus for the curved surface, use the intersection of the extended internal rays, not the solid emerging rays. Use narrow parallel rays aligned to the optical axis; a general crossing is not automatically labeled a focal point.
- Measure from A to the relevant crossing, or A to C for radius. The ruler reports an **unsigned length**. Apply the appropriate sign convention yourself when using focal lengths or radii in equations, and convert mm to meters when calculating diopters. A small spread in crossings can occur with exact circular-surface tracing; no automatic focal-point or power calculation is imposed.

## Bench tool buttons

**Ruler** and **Protractor** at the upper-left of the bench toggle independently. Hiding a tool preserves its position; Reset hides both and restores their initial positions. Both tools remain movable in Inspect without moving the optical elements.

For the protractor, drag the center or transparent face to position it. Drag the outer teal handle to rotate its baseline, and the gold arm to read an angle from 0° to 180°. For an incidence or refraction measurement, place the center at the surface intersection and align the baseline with the relevant normal. The tool measures the angle you set; it does not automatically reveal an optical answer.
