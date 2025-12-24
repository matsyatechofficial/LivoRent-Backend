const AuthService = require('../services/authService');

const authController = {
  // Tenant/Owner Signup
  signup: async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      // Validate role (only tenant or owner allowed)
      if (!['tenant', 'owner'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Must be tenant or owner' });
      }

      const result = await AuthService.signup({ name, email, password, role });
      res.status(201).json({
        message: 'Registration successful',
        user: result
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // Tenant/Owner Login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      
      res.json({
        message: 'Login successful',
        ...result
      });
    } catch (error) {
      res.status(401).json({ message: error.message });
    }
  },

  // In controllers/authController.js
adminLogin: async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.adminLogin(email, password);
    
    // Make sure response includes user with admin role
    res.json({
      message: 'Admin login successful',
      user: result.user, // Should have role: 'admin'
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
},

  // Refresh   token
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);
      res.json(result);
    } catch (error) {
      res.status(401).json({ message: error.message });
    }
  },

  // Get Profile
  getProfile: async (req, res) => {
    try {
      const user = await AuthService.getProfile(req.user.id);
      res.json({ user });
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },

  // Logout
  logout: async (req, res) => {
    try {
      await AuthService.logout(req.user.id);
      res.json({ message: 'Logout successful' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Protected test endpoints
  tenantOnly: (req, res) => {
    res.json({ message: 'Tenant access granted', user: req.user });
  },

  ownerOnly: (req, res) => {
    res.json({ message: 'Owner access granted', user: req.user });
  },

  adminOnly: (req, res) => {
    res.json({ message: 'Admin access granted', user: req.user });
  }
};

module.exports = authController;