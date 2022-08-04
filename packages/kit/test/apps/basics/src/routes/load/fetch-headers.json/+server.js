/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ request }) {
	/** @type {Record<string, string>} */
	const body = {};

	request.headers.forEach((value, key) => {
		body[key] = value;
	});

	return new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json; charset=utf-8' }
	});
}