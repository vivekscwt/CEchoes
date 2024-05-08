
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
    }
})

module.exports = {
    transporter: transporter,
};