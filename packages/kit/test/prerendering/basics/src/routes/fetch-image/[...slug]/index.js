import * as fs from 'fs';

export async function GET({ params }) {
	const slug = params.slug.split('/');
	const extension = slug[0].split('.').pop();

	const file = fs.readFileSync(`./static/image.${extension}`);

	return {
		status: 200,
		headers: {
			'Content-Type': 'image/' + extension
		},
		body: file
	};
}
