# Babel and Abram (Genesis 11)

A song and code-rendered lyric film of Genesis 11: the tower of Babel built of brick and pitch, the LORD coming down and confounding the one language, the generations from Shem to Terah, and Abram, the name no one built, setting out from Ur on the open road.

Built with the Ark engine: https://github.com/omiron33/ark-video-studio

[Listen at TechnoChristianity](https://technochristianity.com/music) · [More films on YouTube](https://www.youtube.com/@technochristianity)

The film runs **5:33** at **1920 × 1080 / 60 fps**, rendered at the engine's ultra tier (64 sub-frames per frame). Every frame of its 18 shots is drawn in code on the GPU: the wet silt and reed beds of the plain of Shinar, a field of mud bricks drying in rows, domed kilns, the terraced brick tower with its ramps, braziers and scaffolding, a storm-cloud deck above it, a river at night with camps along a clay bank, a sandstone cliff at sunrise and the desert road west to Haran. Nothing in the picture is a photograph, a downloaded model or a generated image, and no person is shown close.

Every sung word is part of the world. The builders' words are stamped into bricks and filled with pitch, fired into the kiln and the tower's walls, glazed into its blue bands. God's words are light in the cloud. In the confusion the words break apart into wedge marks after they are read. The generations are cut into the riverbank beside a scarlet thread that runs from camp to camp. ABRAM is cut into living rock and caught by the sunrise, and the last lines are pressed into the dust of the road beside the tracks going west.

## Source layout

- `film.json`: the 18 shots and their timings, cut on measured beats.
- `scenes/`: one module per shot (camera, light, which words are where).
- `lib/`: the worlds (`x-plain.js`, `x-tower.js` with `tower.js`, `x-river.js`, `x-desert.js`), the shared GLSL (`g-common.js`), the camera track (`cam.js`), the look (`look.js`) and the typography (`type.js`).
- `data/`: the aligned sung words and lines, and the measured musical timing.
- `docs/STORYBOARD.md`: what each shot is for and where its words live.
- `tools/`: timing (`analyze.py`, `vocals.py`, `timing.py`), test stills (`look.sh`, `linecheck.sh`) and a camera inspector.
- `intake/sung-lyrics.txt`: the sung lyric text.

## Rendering

The scenes render with the photoreal mode of the Ark engine (`photoreal/film.mjs`). Place the original 48 kHz stereo recording at `media/song.wav`, then from an engine checkout beside this folder:

```sh
node photoreal/render.mjs stills --song ../genesis11-babel-and-abram --scene s03-ramp --params '{"from":56.9,"to":84.4}' --t 64 --samples 16
node photoreal/film.mjs --song ../genesis11-babel-and-abram
```

The scenes use the engine's motion kit (`/kit/motion.js`, `/kit/life.js`). A full ultra render is GPU intensive and takes most of a day on two machines.

## License

Source code is released under the [MIT License](LICENSE). The song recording and the finished film are separate media releases; the source-code license does not grant any rights to the recording, its lyrics as a recorded work, or the rendered film.
