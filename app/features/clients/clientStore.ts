import type { Client } from "./types";

const STORAGE_KEY = "mkm_clients";

const getInitialClients = (): Client[] => {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored) return JSON.parse(stored);
	return [];
};

export const clientStore = {
	getAll: (): Client[] => {
		return getInitialClients();
	},

	save: (client: Client) => {
		const clients = getInitialClients();
		const index = clients.findIndex((c) => c.id === client.id);
		if (index >= 0) {
			clients[index] = client;
		} else {
			clients.push(client);
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
	},

	delete: (id: string) => {
		const clients = getInitialClients().filter((c) => c.id !== id);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
	},
};
