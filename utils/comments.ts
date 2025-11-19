export const COMMENT_SERVER_URL = process.env.EXPO_PUBLIC_COMMENT_SERVER_URL;

export const commentAPI = {
    makeTaskName(emuId: string): string {
        const now = new Date();

        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const year = now.getFullYear();

        const hours = String(now.getHours()).padStart(2, '0'); // 24-hour format by default
        const minutes = String(now.getMinutes()).padStart(2, '0');

        const timeString = `${day}${month}${year}-${hours}${minutes}`;

        return `mood-checkin_${emuId}_${timeString}`;
    },
    async startComment(taskName: string): Promise<string> {
        try {
            const response = await fetch(`${COMMENT_SERVER_URL}/send_comment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({event: 'start', task: taskName}),
              });
            if (!response.ok) {
                return `unable to send start comment: ${JSON.stringify(response.body)}`;
              } 
            return 'successfully sent start comment'
        } catch (error) {
            return `unable to send start comment: ${error}` 
        }
    },
    async stopComment(taskName: string): Promise<string> {
        try {
            const response = await fetch(`${COMMENT_SERVER_URL}/send_comment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({event: 'stop', task: taskName}),
              });
            if (!response.ok) {
                return `unable to send stop comment: ${JSON.stringify(response.body)}`;
              } 
            return 'successfully sent stop comment'
        } catch (error) {
            return `unable to send stop comment: ${error}` 
        }
    },
    async annotationComment(taskName: string, annotation: string): Promise<string> {
        try {
            const response = await fetch(`${COMMENT_SERVER_URL}/send_comment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({event: 'annotate', task: taskName, additional_text: annotation}),
              });
            if (!response.ok) {
                return `unable to send annotation comment: ${JSON.stringify(response.body)}`;
              } 
            return 'successfully sent annotation comment'
        } catch (error) {
            return `unable to send annotation comment: ${error}` 
        }
    }
}