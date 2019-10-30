const express = require('express');
const mysql = require('mysql');
const fs = require('fs');
const util = require('util');
const PDFDocument = require('pdfkit');
const Jimp = require('jimp');
const PORT = process.env.PORT || 8080;
const app = express();
app.listen(PORT, console.log(`Server started on port ${PORT}`));
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'pdf-generator'
});
db.connect();
const query = util.promisify(db.query.bind(db));
app.get('/:firstName', async (req, res) => {
    try {
        const firstName = req.params.firstName;        
        const result = await query(`SELECT * FROM result  WHERE  firstName = '${firstName}' ;`)
        if (result.length === 0) {
            throw new Error(`User with given name doesn't exist`);
        }
        const image = await Jimp.read(result[0]['image(binary)']);
        const imageBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        const pdf = await createPdf(result[0].firstName, result[0].lastName, imageBuffer);
        await query(`UPDATE result  SET \`pdf(binary)\`=?  WHERE firstName = ?`, [pdf, firstName]);
        res.send({ done: true });
    } catch (err) {
        res.send({ done: false });
    };
})
function createPdf(firstName, secondName, image) {
    const doc = new PDFDocument;
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.fontSize(25)
        .text(`${firstName} ${secondName}`, {
            width: 400,
            align: 'center'
        })
        .image(image, 220, 100, { fit: [100, 100], align: 'center' })
        .pipe(fs.createWriteStream('files/file.pdf'));
    doc.end();
    return new Promise(resolve => {
        doc.on('end', () => {
            resolve(Buffer.concat(buffers));
        })
    })
}
