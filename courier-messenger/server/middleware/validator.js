const { validationResult, body } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Имя пользователя: 3-30 символов'),
  body('email').isEmail().normalizeEmail().withMessage('Некорректный email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Пароль минимум 6 символов'),
  body('phone')
    .matches(/^\+?[\d\s\-()]{10,15}$/)
    .withMessage('Некорректный телефон'),
  body('role')
    .isIn(['courier', 'dispatcher', 'admin'])
    .withMessage('Роль: courier, dispatcher или admin'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Некорректный email'),
  body('password').notEmpty().withMessage('Пароль обязателен'),
];

const messageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Сообщение: 1-5000 символов'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'location', 'status_update', 'system'])
    .withMessage('Недопустимый тип сообщения'),
];

module.exports = {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  messageValidation,
};
