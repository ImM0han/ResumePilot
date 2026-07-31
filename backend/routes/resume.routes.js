const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const controller = require('../controllers/resumeController');

router.post('/extract-resume', upload.single('resume'), controller.extractResume);
router.post('/build-resume', controller.buildResume);
router.post('/optimize-resume', upload.single('resume'), controller.optimizeResume);
router.post('/check-ats', upload.single('resume'), controller.checkATS);
router.post('/recruiter-dashboard', upload.single('resume'), controller.recruiterDashboard);
router.post('/cover-letter', controller.coverLetter);
router.post('/interview', controller.interviewPrep);
router.post('/export', controller.exportResume);

module.exports = router;
