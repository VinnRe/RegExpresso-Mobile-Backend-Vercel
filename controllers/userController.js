const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const catchAsync = require("../utils/catchAsync.js");
const User = require("../models/userModel.js"); 

const hashPassword = async (pass) => {
    return await bcrypt.hash(pass, 10);
};

const signToken = (id, expiryTime) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: expiryTime || process.env.JWT_EXPIRES_IN,
    });
};

const createSendToken = (user, statusCode, res, expiryTime) => {
    const token = signToken(user._id, expiryTime);

    const cookieOptions = {
        expires: new Date(Date.now() + 5 * 24 * 3600000),
        httpOnly: true,
    };

    res.cookie("jwt", token, cookieOptions);
    res.status(statusCode).json({
        status: "success",
        token,
        data: user,
    });
};

exports.signup = catchAsync(async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json("All fields are required.");
        }

        // Check if the user already exists with the same username
        let existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json("User already exists with provided username!");
        }

        // Check if the user already exists with the same email
        existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json("User already exists with provided email!");
        }

        // Hash the password
        let hashedPassword;
        try {
            hashedPassword = await hashPassword(password);
            if (!hashedPassword) {
                return res.status(500).json("Password hashing failed.");
            }
        } catch (err) {
            return res.status(500).json({ message: "Password hashing error", error: err.message });
        }

        // Log the data to check before creating the user
        console.log('Creating new user:', { username, email });

        // Create the new user
        const newUser = await User.create({ username, email, password: hashedPassword });

        // Send the token
        createSendToken(newUser, 201, res);

    } catch (err) {
        console.error("Signup error:", err);
        if (err.code === 11000) {
            return res.status(409).json("User already exists!");
        } else {
            return res.status(500).json({ message: "Internal server error! Please try again.", error: err.message });
        }
    }
});


exports.login = catchAsync(async (req, res) => {
    const { username, password } = req.body;

    let user = await User.findOne({ email: username });
    if (!user) {
        user = await User.findOne({ username });
    }
    if (!user) {
        return res.status(404).json("User cannot be found!");
    }

    const isPasswordCorrect = await user.correctPassword(password, user.password);

    if (!isPasswordCorrect) {
        return res.status(401).json("Incorrect password!");
    } else {
        createSendToken(user, 200, res, '9999 years');
    }
});

exports.logout = catchAsync(async (req, res) => {
    res.cookie("jwt", "loggedout", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({ status: "success", message: "Logged out successfully!" });
});

exports.fetchUser = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    try{
    if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ 
            id: user._id,
            username: user.username,
            email: user.email 
        }); 
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

exports.updatePass = catchAsync(async (req, res) => {
    const { password} = req.body;
    if (!password || password.length < 8) {
        return next(new AppError("Password must be at least 8 characters long", 400));
      }
    try{
      const _user = await User.findById(req.user.id);
  
      if (!_user) {
        return next(new AppError("User not found", 404));
      }
  
      _user.password = await hashPassword(password);
      await _user.save();
  
      createSendToken(_user, 200, res, "9999 years");
    }catch(err){
        if (err.message === "jwt expired") {
            return next(new AppError("Your session has expired! Please log in again", 401));
        }
        next(err);
    }
  });

exports.protect = catchAsync(async (req, res, next) => {
    const { authorization } = req.headers;
    let token;

    if (authorization && authorization.startsWith("Bearer")) {
        token = authorization.split(" ")[1];
    }

    if (!token) {
        return next(new AppError("You are not logged in! Please log in to get access", 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const freshUser = await User.findById(decoded.id);

        if (!freshUser) {
            return next(new AppError("The user belonging to this token does not exist", 401));
        }
        req.user = freshUser;
        next();
    } catch (err) {
        if (err.message === "jwt expired") {
            return next(new AppError("Your session has expired! Please log in again", 401));
        }
        next(err);
    }
});
