import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { resolveSymlinkTarget } from "@t3tools/shared/symlink";

/**
 * Replaces a file's contents via a sibling temp file and rename. A symlinked
 * target is resolved first so the link survives and its destination is
 * rewritten, since renaming over the link itself would swap it for a regular file.
 */
export const writeFileStringAtomically = (input: {
  readonly filePath: string;
  readonly contents: string;
}) =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const targetPath = yield* resolveSymlinkTarget(input.filePath);
      const targetDirectory = path.dirname(targetPath);

      yield* fs.makeDirectory(targetDirectory, { recursive: true });
      const tempDirectory = yield* fs.makeTempDirectoryScoped({
        directory: targetDirectory,
        prefix: `${path.basename(targetPath)}.`,
      });
      const tempPath = path.join(tempDirectory, "contents.tmp");

      yield* fs.writeFileString(tempPath, input.contents);
      yield* fs.rename(tempPath, targetPath);
    }),
  );

/**
 * Publishes a finished file at `destination` unless a file is already there.
 *
 * A hard link does this atomically. Android forbids hard links in app storage,
 * so there it falls back to an existence check and a rename, after which
 * `source` is gone. That can only lose a race to another process publishing at
 * the same moment, which callers already tolerate by reading the winner back.
 */
export const publishWithoutReplacing = Effect.fn("publishWithoutReplacing")(function* (
  source: string,
  destination: string,
) {
  const fs = yield* FileSystem.FileSystem;
  yield* fs.link(source, destination).pipe(
    Effect.catchIf(
      (error) => error.reason._tag === "AlreadyExists",
      () => Effect.void,
    ),
    Effect.catchIf(
      (error) => error.reason._tag === "PermissionDenied",
      () =>
        Effect.gen(function* () {
          if (yield* fs.exists(destination)) return;
          yield* fs.rename(source, destination);
        }),
    ),
  );
});
