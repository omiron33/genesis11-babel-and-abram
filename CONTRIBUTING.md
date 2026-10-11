# Contributing to Babel and Abram (Genesis 11)

Pull requests are welcome: bug fixes, documentation, new scene ideas and tooling.

Every pull request needs an approving review from Shane Fisher (@omiron33), the code owner, before it can be merged. Please work on a branch or a fork and open a pull request against `main`.

## Run it

You need Node.js 22 or newer, Google Chrome with WebGL2, FFmpeg, and a checkout of the Ark engine (https://github.com/omiron33/ark-video-studio) beside this folder. Test stills:

```sh
tools/look.sh s01-brickfield 33,40 16
```

A full render needs the original recording at `media/song.wav`, which is not in this repository.

## Guidelines

- Every frame must be a pure function of song time: no wall-clock time or unseeded randomness.
- Words belong to the world: cut them into a surface in the scene rather than laying them over the picture.
- No people are shown close; keep it that way.
