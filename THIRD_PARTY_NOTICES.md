# Third-Party Notices

This project includes third-party creative assets. Each component is
used under the terms of its original license, reproduced or referenced
below.

## Memoji-style avatar artwork (Karim White + Kulthum White)

**Two 1011 avatar characters (58 PNGs total, ~2.5 MB)** ship under
[`public/avatar-assets/v1/`](public/avatar-assets/v1/). Both characters
originated in the `dapvatar` npm package (version 0.1.4 at the time of
extraction), which in turn re-hosts artwork from the **"+1500 Memoji
Pack (Community)"** by **Moein Rabti**
([@m031n](https://www.figma.com/@m031n) /
[X](https://x.com/_m031n_)).

- **Artwork author**: Moein Rabti
- **License**: Creative Commons Attribution 4.0 International
  ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))
- **Source at extraction**: `dapvatar@0.1.4` (MIT), which stated in
  its NOTICE file: *"assets were renamed, reorganized, and indexed for
  deterministic matching by seed text. No visual modifications were
  applied to the artwork."*
- **What 1011 Tracker redistributes**: **only the Karim White and
  Kulthum White expression sets** (29 PNGs each). None of the other 54
  characters from the source pack are included.
- **1011-side modifications**: none. The PNG files are served
  byte-for-byte as they appeared in `dapvatar@0.1.4/assets/`. The
  `dapvatar` npm package itself is no longer a dependency — Phase 6.2
  extracted the needed assets and removed the runtime dependency.

Attribution is surfaced in-app at **Profile → Credits** so the required
notice reaches every user, and reproduced here so it also lives in the
source tree.

## Full attribution text

> Memoji artwork by [Moein Rabti (@m031n)](https://www.figma.com/@m031n),
> licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
> Original catalog assembled and indexed as `dapvatar` (MIT). 1011
> Tracker redistributes only the Karim White and Kulthum White
> expression sets as-provided; no visual modifications have been made.

## Runtime privacy

Avatar assets are served exclusively from the 1011 origin under
`/avatar-assets/v1/`. No external CDN is consulted at render time. No
user identifier (email, username, name) is sent to any third-party
service for avatar rendering. There are no API keys.
