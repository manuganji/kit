import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import create_manifest_data from './index.js';
import options from '../../config/options.js';

const cwd = fileURLToPath(new URL('./test', import.meta.url));

/**
 * @param {string} dir
 * @param {import('types').Config} config
 */
const create = (dir, config = {}) => {
	const initial = options(config, 'config');

	initial.kit.files.assets = path.resolve(cwd, 'static');
	initial.kit.files.params = path.resolve(cwd, 'params');
	initial.kit.files.routes = path.resolve(cwd, dir);

	return create_manifest_data({
		config: /** @type {import('types').ValidatedConfig} */ (initial),
		fallback: cwd,
		cwd
	});
};

const default_layout = {
	component: 'layout.svelte'
};

const default_error = 'error.svelte';

test('creates routes', () => {
	const { components, routes } = create('samples/basic');

	const index = 'samples/basic/+page.svelte';
	const about = 'samples/basic/about/+page.svelte';
	const blog = 'samples/basic/blog/+page.svelte';
	const blog_$slug = 'samples/basic/blog/[slug]/+page.svelte';

	assert.equal(components, [
		default_layout.component,
		default_error,
		index,
		about,
		blog,
		blog_$slug
	]);

	assert.equal(routes, [
		{
			type: 'page',
			id: '',
			pattern: /^\/$/,
			errors: [default_error],
			layouts: [default_layout],
			page: {
				component: index
			}
		},

		{
			type: 'endpoint',
			id: 'blog.json',
			pattern: /^\/blog\.json$/,
			file: 'samples/basic/blog.json/+server.js'
		},

		{
			type: 'page',
			id: 'about',
			pattern: /^\/about\/?$/,
			errors: [default_error],
			layouts: [default_layout],
			page: {
				component: about
			}
		},

		{
			type: 'page',
			id: 'blog',
			pattern: /^\/blog\/?$/,
			errors: [default_error],
			layouts: [default_layout],
			page: {
				component: blog
			}
		},

		{
			type: 'endpoint',
			id: 'blog/[slug].json',
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'samples/basic/blog/[slug].json/+server.ts'
		},

		{
			type: 'page',
			id: 'blog/[slug]',
			pattern: /^\/blog\/([^/]+?)\/?$/,
			errors: [default_error],
			layouts: [default_layout],
			page: {
				component: blog_$slug
			}
		}
	]);
});

const symlink_survived_git = fs
	.statSync(path.join(cwd, 'samples/symlinks/routes/foo'))
	.isSymbolicLink();

const test_symlinks = symlink_survived_git ? test : test.skip;

test_symlinks('creates symlinked routes', () => {
	const { components, routes } = create('samples/symlinks/routes');

	const index = 'samples/symlinks/routes/index.svelte';
	const symlinked_index = 'samples/symlinks/routes/foo/index.svelte';

	assert.equal(components, [default_layout, default_error, symlinked_index, index]);

	assert.equal(routes, [
		{
			type: 'page',
			id: '',
			pattern: /^\/$/,
			path: '/',
			shadow: null,
			a: [default_layout, index],
			b: [default_error]
		},

		{
			type: 'page',
			id: 'foo',
			pattern: /^\/foo\/?$/,
			path: '/foo',
			shadow: null,
			a: [default_layout, symlinked_index],
			b: [default_error]
		}
	]);
});

test('creates routes with layout', () => {
	const { components, routes } = create('samples/basic-layout');

	const layout = 'samples/basic-layout/+layout.svelte';
	const index = 'samples/basic-layout/+page.svelte';
	const foo___layout = 'samples/basic-layout/foo/+layout.svelte';
	const foo = 'samples/basic-layout/foo/+page.svelte';

	assert.equal(components, [layout, default_error, foo___layout, index, foo]);

	assert.equal(
		routes.slice(1, 2),
		[
			{
				type: 'page',
				id: '',
				pattern: /^\/$/,
				errors: [default_error],
				layouts: [
					{
						component: layout
					}
				],
				page: {
					component: index
				}
			},

			{
				type: 'page',
				id: 'foo',
				pattern: /^\/foo\/?$/,
				errors: [default_error],
				layouts: [
					{
						component: layout
					},
					{
						component: foo___layout
					}
				],
				page: {
					component: foo
				}
			}
		].slice(1, 2)
	);
});

test('succeeds when routes does not exist', () => {
	const { components, routes } = create('samples/basic/routes');
	assert.equal(components, ['layout.svelte', 'error.svelte']);
	assert.equal(routes, []);
});

// TODO some characters will need to be URL-encoded in the filename
test('encodes invalid characters', () => {
	const { components, routes } = create('samples/encoding');

	// had to remove ? and " because windows

	// const quote = 'samples/encoding/".svelte';
	const hash = 'samples/encoding/%23/+page.svelte';
	// const question_mark = 'samples/encoding/?.svelte';

	assert.equal(components, [
		default_layout.component,
		default_error,
		// quote,
		hash
		// question_mark
	]);

	assert.equal(
		routes.map((p) => p.pattern),
		[
			// /^\/%22\/?$/,
			/^\/%23\/?$/
			// /^\/%3F\/?$/
		]
	);
});

test('sorts routes correctly', () => {
	const { routes } = create('samples/sorting');

	assert.equal(
		routes.map((p) => p.id),
		[
			'',
			'about',
			'post',
			'post/bar',
			'post/foo',
			'post/f[yy].json',
			'post/f[zz]',
			'post/f[xx]',
			'post/f[yy]',
			'post/[id]',
			'[endpoint]',
			'[wildcard]',
			'[...rest]/deep/[...deep_rest]/xyz',
			'[...rest]/deep/[...deep_rest]',
			'[...rest]/abc',
			'[...rest]/deep',
			'[...anotherrest]',
			'[...rest]'
		]
	);
});

test('sorts routes with rest correctly', () => {
	const { routes } = create('samples/rest');

	assert.equal(routes, [
		{
			type: 'page',
			id: 'a/[...rest]',
			pattern: /^\/a(?:\/(.*))?\/?$/,
			errors: [default_error],
			layouts: [default_layout],
			page: {
				component: 'samples/rest/a/[...rest]/+page.svelte',
				server: 'samples/rest/a/[...rest]/+page.server.js'
			}
		},
		{
			type: 'page',
			id: 'b/[...rest]',
			pattern: /^\/b(?:\/(.*))?\/?$/,
			errors: [default_error],
			layouts: [default_layout],
			page: {
				component: 'samples/rest/b/[...rest]/+page.svelte',
				server: 'samples/rest/b/[...rest]/+page.server.ts'
			}
		}
	]);
});

test('allows rest parameters inside segments', () => {
	const { routes } = create('samples/rest-prefix-suffix');

	assert.equal(routes, [
		{
			type: 'page',
			id: 'prefix-[...rest]',
			pattern: /^\/prefix-(.*?)\/?$/,
			errors: [default_error],
			layouts: [default_layout],
			page: {
				component: 'samples/rest-prefix-suffix/prefix-[...rest]/+page.svelte'
			}
		},
		{
			type: 'endpoint',
			id: '[...rest].json',
			pattern: /^\/(.*?)\.json$/,
			file: 'samples/rest-prefix-suffix/[...rest].json/+server.js'
		}
	]);
});

test('ignores files and directories with leading underscores', () => {
	const { routes } = create('samples/hidden-underscore');

	assert.equal(routes.map((r) => r.type === 'endpoint' && r.file).filter(Boolean), [
		'samples/hidden-underscore/e/f/g/h.js'
	]);
});

test('ignores files and directories with leading dots except .well-known', () => {
	const { routes } = create('samples/hidden-dot');

	assert.equal(routes.map((r) => r.type === 'endpoint' && r.file).filter(Boolean), [
		'samples/hidden-dot/.well-known/dnt-policy.txt.js'
	]);
});

test('allows multiple slugs', () => {
	const { routes } = create('samples/multiple-slugs');

	assert.equal(
		routes.filter((route) => route.type === 'endpoint'),
		[
			{
				type: 'endpoint',
				id: '[file].[ext]',
				pattern: /^\/([^/]+?)\.([^/]+?)$/,
				file: 'samples/multiple-slugs/[file].[ext].js'
			}
		]
	);
});

test('fails if dynamic params are not separated', () => {
	assert.throws(() => {
		create('samples/invalid-params');
	}, /Invalid route samples\/invalid-params\/\[foo\]\[bar\]\.js — parameters must be separated/);
});

test('ignores things that look like lockfiles', () => {
	const { routes } = create('samples/lockfiles');

	assert.equal(routes, [
		{
			type: 'endpoint',
			id: 'foo',
			file: 'samples/lockfiles/foo.js',
			pattern: /^\/foo\/?$/
		}
	]);
});

test('works with custom extensions', () => {
	const { components, routes } = create('samples/custom-extension', {
		extensions: ['.jazz', '.beebop', '.funk', '.svelte']
	});

	const index = 'samples/custom-extension/index.funk';
	const about = 'samples/custom-extension/about.jazz';
	const blog = 'samples/custom-extension/blog/index.svelte';
	const blog_$slug = 'samples/custom-extension/blog/[slug].beebop';

	assert.equal(components, [default_layout, default_error, about, blog_$slug, blog, index]);

	assert.equal(routes, [
		{
			type: 'page',
			id: '',
			pattern: /^\/$/,
			path: '/',
			shadow: null,
			a: [default_layout, index],
			b: [default_error]
		},

		{
			type: 'endpoint',
			id: 'blog.json',
			pattern: /^\/blog\.json$/,
			file: 'samples/custom-extension/blog/index.json.js'
		},

		{
			type: 'page',
			id: 'about',
			pattern: /^\/about\/?$/,
			path: '/about',
			shadow: null,
			a: [default_layout, about],
			b: [default_error]
		},

		{
			type: 'page',
			id: 'blog',
			pattern: /^\/blog\/?$/,
			path: '/blog',
			shadow: null,
			a: [default_layout, blog],
			b: [default_error]
		},

		{
			type: 'endpoint',
			id: 'blog/[slug].json',
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'samples/custom-extension/blog/[slug].json.js'
		},

		{
			type: 'page',
			id: 'blog/[slug]',
			pattern: /^\/blog\/([^/]+?)\/?$/,
			path: '',
			shadow: null,
			a: [default_layout, blog_$slug],
			b: [default_error]
		}
	]);
});

test('lists static assets', () => {
	const { assets } = create('samples/basic');

	assert.equal(assets, [
		{
			file: 'bar/baz.txt',
			size: 14,
			type: 'text/plain'
		},
		{
			file: 'foo.txt',
			size: 9,
			type: 'text/plain'
		}
	]);
});

test('includes nested error components', () => {
	const { routes } = create('samples/nested-errors');

	assert.equal(routes, [
		{
			type: 'page',
			id: 'foo/bar/baz',
			pattern: /^\/foo\/bar\/baz\/?$/,
			path: '/foo/bar/baz',
			shadow: null,
			a: [
				default_layout,
				'samples/nested-errors/foo/+layout.svelte',
				undefined,
				'samples/nested-errors/foo/bar/baz/+layout.svelte',
				'samples/nested-errors/foo/bar/baz/index.svelte'
			],
			b: [
				default_error,
				undefined,
				'samples/nested-errors/foo/bar/__error.svelte',
				'samples/nested-errors/foo/bar/baz/__error.svelte'
			]
		}
	]);
});

test('creates routes with named layouts', () => {
	const { components, routes } = create('samples/named-layouts');

	assert.equal(components, [
		'samples/named-layouts/+layout.svelte',
		default_error,
		'samples/named-layouts/+layout-home@default.svelte',
		'samples/named-layouts/+layout-special.svelte',
		'samples/named-layouts/a/+layout.svelte',
		'samples/named-layouts/b/+layout-alsospecial@special.svelte',
		'samples/named-layouts/b/c/+layout.svelte',
		'samples/named-layouts/b/d/+layout-extraspecial@special.svelte',
		'samples/named-layouts/b/d/+layout-special.svelte',
		'samples/named-layouts/a/a1.svelte',
		'samples/named-layouts/a/a2@special.svelte',
		'samples/named-layouts/b/c/c1@alsospecial.svelte',
		'samples/named-layouts/b/c/c2@home.svelte',
		'samples/named-layouts/b/d/d1.svelte',
		'samples/named-layouts/b/d/d2@extraspecial.svelte',
		'samples/named-layouts/b/d/index@special.svelte'
	]);

	assert.equal(routes, [
		{
			type: 'page',
			id: 'a/a1',
			pattern: /^\/a\/a1\/?$/,
			path: '/a/a1',
			shadow: null,
			a: [
				'samples/named-layouts/+layout.svelte',
				'samples/named-layouts/a/+layout.svelte',
				'samples/named-layouts/a/a1.svelte'
			],
			b: [default_error]
		},
		{
			type: 'page',
			id: 'a/a2@special',
			pattern: /^\/a\/a2\/?$/,
			path: '/a/a2',
			shadow: null,
			a: [
				'samples/named-layouts/+layout-special.svelte',
				'samples/named-layouts/a/a2@special.svelte'
			],
			b: [default_error]
		},
		{
			type: 'page',
			id: 'b/d@special',
			pattern: /^\/b\/d\/?$/,
			path: '/b/d',
			shadow: null,
			a: [
				'samples/named-layouts/+layout.svelte',
				'samples/named-layouts/b/d/+layout-special.svelte',
				'samples/named-layouts/b/d/index@special.svelte'
			],
			b: [default_error]
		},
		{
			type: 'page',
			id: 'b/c/c1@alsospecial',
			pattern: /^\/b\/c\/c1\/?$/,
			path: '/b/c/c1',
			shadow: null,
			a: [
				'samples/named-layouts/+layout-special.svelte',
				'samples/named-layouts/b/+layout-alsospecial@special.svelte',
				'samples/named-layouts/b/c/c1@alsospecial.svelte'
			],
			b: [default_error]
		},
		{
			type: 'page',
			id: 'b/c/c2@home',
			pattern: /^\/b\/c\/c2\/?$/,
			path: '/b/c/c2',
			shadow: null,
			a: [
				'samples/named-layouts/+layout.svelte',
				'samples/named-layouts/+layout-home@default.svelte',
				'samples/named-layouts/b/c/c2@home.svelte'
			],
			b: [default_error, default_error]
		},
		{
			type: 'page',
			id: 'b/d/d1',
			pattern: /^\/b\/d\/d1\/?$/,
			path: '/b/d/d1',
			shadow: null,
			a: ['samples/named-layouts/+layout.svelte', 'samples/named-layouts/b/d/d1.svelte'],
			b: [default_error]
		},
		{
			type: 'page',
			id: 'b/d/d2@extraspecial',
			pattern: /^\/b\/d\/d2\/?$/,
			path: '/b/d/d2',
			shadow: null,
			a: [
				'samples/named-layouts/+layout.svelte',
				'samples/named-layouts/b/d/+layout-special.svelte',
				'samples/named-layouts/b/d/+layout-extraspecial@special.svelte',
				'samples/named-layouts/b/d/d2@extraspecial.svelte'
			],
			b: [default_error]
		}
	]);
});

test('errors on missing layout', () => {
	assert.throws(
		() => create('samples/named-layout-missing'),
		/samples\/named-layout-missing\/index@missing.svelte references missing layout "missing"/
	);
});

test('errors on layout named default', () => {
	assert.throws(
		() => create('samples/named-layout-default'),
		/samples\/named-layout-default\/+layout-default.svelte cannot use reserved "default" name/
	);
});

test('errors on duplicate layout definition', () => {
	assert.throws(
		() => create('samples/duplicate-layout'),
		/Duplicate layout samples\/duplicate-layout\/+layout-a@x.svelte already defined at samples\/duplicate-layout\/+layout-a.svelte/
	);
});

test('errors on recursive name layout', () => {
	assert.throws(
		() => create('samples/named-layout-recursive-1'),
		/Recursive layout detected: samples\/named-layout-recursive-1\/+layout-a@b\.svelte -> samples\/named-layout-recursive-1\/+layout-b@a\.svelte -> samples\/named-layout-recursive-1\/+layout-a@b\.svelte/
	);
	assert.throws(
		() => create('samples/named-layout-recursive-2'),
		/Recursive layout detected: samples\/named-layout-recursive-2\/+layout-a@a\.svelte -> samples\/named-layout-recursive-2\/+layout-a@a\.svelte/
	);

	assert.throws(
		() => create('samples/named-layout-recursive-3'),
		/Recursive layout detected: samples\/named-layout-recursive-3\/+layout@a\.svelte -> samples\/named-layout-recursive-3\/+layout-a@default\.svelte -> samples\/named-layout-recursive-3\/+layout@a\.svelte/
	);
});

test('errors on layout in directory', () => {
	assert.throws(
		() => create('samples/named-layout-on-directory-1'),
		/Invalid route samples\/named-layout-on-directory-1\/foo@a\/index.svelte - named layouts are not allowed in directories/
	);

	assert.throws(
		() => create('samples/named-layout-on-directory-2'),
		/Invalid route samples\/named-layout-on-directory-2\/foo@a\/bar.svelte - named layouts are not allowed in directories/
	);
});

test('creates param matchers', () => {
	const { matchers } = create('samples/basic'); // directory doesn't matter for the test

	assert.equal(matchers, {
		foo: path.join('params', 'foo.js'),
		bar: path.join('params', 'bar.js')
	});
});

test('errors on param matchers with bad names', () => {
	const boogaloo = path.resolve(cwd, 'params', 'boo-galoo.js');
	fs.writeFileSync(boogaloo, '');
	try {
		assert.throws(() => create('samples/basic'), /Matcher names can only have/);
	} finally {
		fs.unlinkSync(boogaloo);
	}
});

test('errors on duplicate matchers', () => {
	const ts_foo = path.resolve(cwd, 'params', 'foo.ts');
	fs.writeFileSync(ts_foo, '');
	try {
		assert.throws(() => {
			create('samples/basic', {
				extensions: ['.js', '.ts']
			});
		}, /Duplicate matchers/);
	} finally {
		fs.unlinkSync(ts_foo);
	}
});

test.run();
