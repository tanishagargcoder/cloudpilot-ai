import asyncio
import websockets
import json

async def test():
    uri = "ws://127.0.0.1:8000/ws/events"
    async with websockets.connect(uri) as websocket:
        welcome = await websocket.recv()
        print("Received:", welcome)

        await websocket.send("run_agent")

        while True:
            message = await websocket.recv()
            data = json.loads(message)
            print(f"\n[{data['event']}]", data)
            if data["event"] == "pipeline_complete":
                break

asyncio.run(test())