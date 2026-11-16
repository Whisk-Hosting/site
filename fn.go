// Small helpers for working with slices as values: none changes what it is given.
package main

func mapOf[T, U any](xs []T, f func(T) U) []U {
	out := make([]U, 0, len(xs))
	for _, x := range xs {
		out = append(out, f(x))
	}
	return out
}

func filter[T any](xs []T, keep func(T) bool) []T {
	out := make([]T, 0, len(xs))
	for _, x := range xs {
		if keep(x) {
			out = append(out, x)
		}
	}
	return out
}

func some[T any](xs []T, ok func(T) bool) bool {
	for _, x := range xs {
		if ok(x) {
			return true
		}
	}
	return false
}

func find[T any](xs []T, ok func(T) bool) (T, bool) {
	for _, x := range xs {
		if ok(x) {
			return x, true
		}
	}
	var zero T
	return zero, false
}

func uniq[T comparable](xs []T) []T {
	seen := make(map[T]bool, len(xs))
	return filter(xs, func(x T) bool {
		if seen[x] {
			return false
		}
		seen[x] = true
		return true
	})
}

// pick is yes when cond holds, else no.
func pick[T any](cond bool, yes, no T) T {
	if cond {
		return yes
	}
	return no
}

// withMark is a raw query with its "?", or nothing.
func withMark(query string) string {
	if query == "" {
		return ""
	}
	return "?" + query
}
