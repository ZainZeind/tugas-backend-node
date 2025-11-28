const http = require('http');

const postData = JSON.stringify({
    email: 'test@example.com',
    name: 'Test User'
});

const optionsPost = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
    }
};

const reqPost = http.request(optionsPost, (res) => {
    console.log(`POST /api/users STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('POST Response:', data);

        // After POST, try GET
        const optionsGet = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/users',
            method: 'GET'
        };

        const reqGet = http.request(optionsGet, (resGet) => {
            console.log(`GET /api/users STATUS: ${resGet.statusCode}`);
            let dataGet = '';
            resGet.on('data', (chunk) => { dataGet += chunk; });
            resGet.on('end', () => {
                console.log('GET Response:', dataGet);

                // Parse ID to delete
                try {
                    const user = JSON.parse(data);
                    if (user.id) {
                        const optionsDelete = {
                            hostname: 'localhost',
                            port: 3000,
                            path: `/api/users/${user.id}`,
                            method: 'DELETE'
                        };
                        const reqDelete = http.request(optionsDelete, (resDelete) => {
                            console.log(`DELETE /api/users/${user.id} STATUS: ${resDelete.statusCode}`);
                            // Cleanup
                            process.exit(0);
                        });
                        reqDelete.end();
                    }
                } catch (e) {
                    console.error("Error parsing response", e);
                }
            });
        });
        reqGet.end();
    });
});

reqPost.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

reqPost.write(postData);
reqPost.end();
