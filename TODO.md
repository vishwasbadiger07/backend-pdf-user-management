# TODO: Fix PDF Upload Functionality

- [x] Update multer configuration in server.js to include file size limits and MIME type validation in addition to extension check
- [x] Add error handling middleware for multer errors in the upload route
- [x] Modify the /upload route response to sanitize file information (avoid exposing full req.file object)
- [ ] Test the upload functionality by running the server and using the api.rest request
