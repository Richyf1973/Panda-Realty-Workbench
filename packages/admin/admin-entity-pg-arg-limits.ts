/**
 * PostgreSQL enforces a **100-argument limit** per function call (variadic builtins such as
 * `json_build_object`, `concat_ws`). Admin list SQL stays under these caps by chunking.
 */

/** Each key/value pair uses 2 arguments — keep pairs ≤45 so 2×45=90 < 100. */
export const JSON_BUILD_OBJECT_MAX_PAIRS_PER_CALL = 45

/** `concat_ws(sep, v1, v2, …)` — separator + at most this many value args per call. */
export const CONCAT_WS_MAX_VALUE_ARGS_PER_CALL = 80
