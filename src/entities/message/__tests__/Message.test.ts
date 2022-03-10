import * as Message from "../Message";

describe("Message", () => {
  describe("getCodeblocks", () => {
    test.only("asd", () => {
      expect(
        Message.getCodeblocks({
          message_id: 950613,
          from: {
            id: 535574172,
            is_bot: false,
            first_name: "Максим",
            last_name: "Храмцов",
            username: "khraks_mamtsov",
            language_code: "en",
          },
          chat: {
            id: 535574172,
            first_name: "Максим",
            last_name: "Храмцов",
            username: "khraks_mamtsov",
            type: "private",
          },
          date: 1646599121,
          text: `ts\n123;`,
          entities: [
            {
              offset: 0,
              length: 7,
              type: "pre",
            },
          ],
        })
      ).toEqualSome(["123;"]);
    });
  });
});
