import prisma from "@/lib/prisma";

export async function GET(request) {
    try {
        const transactions = await prisma.transactions.findMany({
            orderBy: {
                transaction_id: 'asc'
            }
        })
        return Response.json({success:true, transactions}, {status:200});
    }
    catch (error) {
        console.log(error.message);
        return Response.json({success:false, error:error.message},{status:500});
    }
}