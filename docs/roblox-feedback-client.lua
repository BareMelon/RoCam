local HttpService = game:GetService("HttpService")

local FEEDBACK_API_URL = "https://your-api-host.com/v1/feedback"
local API_KEY = "your-game-api-key"

local function submitFeedback(payload)
    local body = HttpService:JSONEncode(payload)
    local headers = {
        ["Content-Type"] = "application/json",
        ["Authorization"] = "Bearer " .. API_KEY
    }

    local success, response = pcall(function()
        return HttpService:PostAsync(FEEDBACK_API_URL, body, Enum.HttpContentType.ApplicationJson, false, headers)
    end)

    if not success then
        warn("Feedback submission failed:", response)
        return nil
    end

    return response
end

local feedbackPayload = {
    type = "bug_report",
    identityOption = "anonymous",
    body = "Player got stuck after jumping off the bridge.",
    metadata = {
        placeId = tostring(game.PlaceId),
        platform = "roblox"
    }
}

submitFeedback(feedbackPayload)
