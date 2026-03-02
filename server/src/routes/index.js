const router = require('express').Router();

router.use('/auth',  require('./auth.routes'));
router.use('/scans', require('./scans.routes'));
// router.use('/scans', require('./fixes.routes'));

module.exports = router;
