const prisma = require("../prisma");

exports.summary = async (req, res) => {

    try {

        const userId = req.user.id;

        const wallet = await prisma.wallet.findUnique({

            where: {

                userId

            }

        });

        res.json({

            success: true,

            data: {

                portfolio: Number(wallet?.rialBalance || 0),

                todayProfit: 0,

                openOrders: 0,

                assets: 0,

                btc: Number(wallet?.btcBalance || 0),

                eth: Number(wallet?.ethBalance || 0),

                usdt: Number(wallet?.usdtBalance || 0)

            }

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};