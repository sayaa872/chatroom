class Message {
    constructor(id, user_id, content, created_at) {
        this.id = id;
        this.user_id = user_id;
        this.content = content;
        this.created_at = created_at;
    }
}

module.exports = Message;
