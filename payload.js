const http = require('http');
const fetch = require('node-fetch');
const	prs = [];

const server = http.createServer((req, res) => {
	switch (req.method) {
		case 'GET':
		  show(res);
      break;
		case 'POST':
			add(req, res);
			break;
    default:
      badRequest(res);
	}
});

server.listen(4567, () => {
  console.log('Listening on http://localhost:4567');
});

function add(req, res) {
	let pullRequest = '';

	req.setEncoding('utf8');
	req.on('data', (chunk) => {
		pullRequest += chunk;
	});
	req.on('end', async () => {
		prs.push(JSON.parse(pullRequest));

		const lastPR = prs[prs.length - 1];

		const branch = await checkBaseBranch(lastPR);
		const files = await listPRFiles(res, lastPR);

		if (files !== void 0 || branch !== void 0) {
			console.log('branch', branch, 'files', files);
			createPRComment(lastPR, branch, files);
		}

		res.end('OK\n');
	})
}

async function checkBaseBranch(lastPR) {
	if (lastPR.pull_request.base.ref === 'master') {
		return `Never ever make the target of your pull request to the ${lastPR.pull_request.base.ref} branch`;
	}
}

async function listPRFiles(res, lastPR) {
	if (lastPR) {
		const files = `https://api.github.com/repos/${lastPR.repository.owner.login}/${lastPR.repository.name}/pulls/${lastPR.number}/files`;

		fetch(files)
			.then(response => response.json())
			.then(data => {
				let messages = [];

				data.forEach(fileObj => {
					if (!fileObj.filename.includes('test')) {
						messages.push('Why no test, bro!');
					}

					if (!fileObj.filename.includes('dist')) {
						messages.push('Why dist, bro!');
					}

					if (fileObj.filename.includes('languages')) {
						messages.push('Why languages, bro!');
					}
				});

				return messages;
			})
			.catch(error => console.error(error));
	}
}

function createPRComment(lastPR, ...comments) {
	const username = '***';
  const password = '****';
	const auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');

	if (comments.length) {
		fetch(`https://api.github.com/repos/${lastPR.repository.owner.login}/${lastPR.repository.name}/issues/${lastPR.number}/comments`, {
      method: 'POST',
      body:    JSON.stringify({ 'body': comments.join(' ') }),
      headers: {
				'Content-Type': 'application/json',
				'Authorization': auth,
			},
	  })
		.then(res => res.json())
    .then(json => console.log(json));
	}
}

function show(res) {
	var html = '<html><head><title>List files</title></head><body>'
		+ '<h1>List files</h1>'
		+ prs.map(function (item, index) {
			return JSON.stringify(item);
		}).join('')
		+ '</body></html>';
	res.setHeader('Content-Type', 'text/html');
	res.setHeader('Content-Length', Buffer.byteLength(html));
	res.end(html);
}

function badRequest(res) {
	res.statusCode = 400;
	res.setHeader('Content-Type', 'text/html');
	res.end('Nieprawidłowe żadanie');
}
