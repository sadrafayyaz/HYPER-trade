const prisma = require("../prisma");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");

class AuthService {

    async register(data) {

        const existingUser = await prisma.user.findUnique({
            where: {
                email: data.email
            }
        });

        if (existingUser) {
            throw new Error("Email already exists");
        }

        const hashedPassword = await hashPassword(data.password);

        const user = await prisma.user.create({

            data: {

                fullName: data.fullName,

                email: data.email.toLowerCase(),

                password: hashedPassword,

                phone: data.phone || null,

                nationalCode: data.nationalCode || null

            }

        });

        const token = generateToken(user);

        return {

            token,

            user: {

                id: user.id,

                fullName: user.fullName,

                email: user.email,

                role: user.role

            }

        };

    }

    async login(email, password) {

        const user = await prisma.user.findUnique({

            where: {

                email: email.toLowerCase()

            }

        });

        if (!user) {

            throw new Error("Invalid email or password");

        }

        const valid = await comparePassword(password, user.password);

        if (!valid) {

            throw new Error("Invalid email or password");

        }

        await prisma.user.update({

            where: {

                id: user.id

            },

            data: {

                lastLogin: new Date()

            }

        });

        const token = generateToken(user);

        return {

            token,

            user: {

                id: user.id,

                fullName: user.fullName,

                email: user.email,

                role: user.role

            }

        };

    }

}

module.exports = new AuthService();