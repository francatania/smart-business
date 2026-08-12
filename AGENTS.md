# Smart Business Agent Instructions

Follow [Development Conventions](docs/development/conventions.md) for every repository change.

In particular, preserve Spring Modulith boundaries: organize backend code by business module, expose only deliberate `<module>.api` contracts, and keep implementation packages internal to their owner module.
