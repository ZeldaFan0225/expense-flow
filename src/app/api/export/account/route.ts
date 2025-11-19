import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {buildAccountExportArchive} from "@/lib/services/account-export-service"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request)
        if (auth.source !== "session") {
            return json(
                {error: "Account exports require a signed-in session."},
                {status: 403}
            )
        }

        const archive = await buildAccountExportArchive(auth.userId)
        return new Response(archive.buffer, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${archive.filename}"`,
                "Cache-Control": "no-store",
            },
        })
    } catch (error) {
        return handleApiError(error)
    }
}
