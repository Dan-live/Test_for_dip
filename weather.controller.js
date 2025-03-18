const db = require("../db");
const API_KEY = "RJKGGKFNWJ6QLZMC76J3KL7HY"; // Замени на свой API-ключ

class WeatherController {
  async getWeather(req, res) {
    const { location } = req.query;
    if (!location) {
      return res.status(400).json({ error: "Не указано местоположение" });
    }

    const API_URL = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}?unitGroup=us&key=${API_KEY}&contentType=json`;

    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(
          `Ошибка API: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Формируем данные в нужном формате
      const weatherData = data.days.flatMap((day) =>
        day.hours.map((hour) => ({
          date: day.datetime, // Дата из day
          time: hour.datetime, // Время из hours
          solarradiation: hour.solarradiation,
          solarenergy: hour.solarenergy,
          windgust: hour.windgust,
          windspeed: hour.windspeed,
        }))
      );

      // Сохраняем в базу
      for (const entry of weatherData) {
        await db.query(
          `INSERT INTO weather_energy_data (date, time, solarradiation, solarenergy, windgust, windspeed) 
          VALUES ($1, $2, $3, $4, $5, $6) 
          ON CONFLICT (date, time) DO UPDATE 
          SET solarradiation = EXCLUDED.solarradiation, 
              solarenergy = EXCLUDED.solarenergy, 
              windgust = EXCLUDED.windgust, 
              windspeed = EXCLUDED.windspeed`,
          [
            entry.date, // Дата (формат YYYY-MM-DD)
            entry.time, // Время (формат HH:MM:SS)
            entry.solarradiation,
            entry.solarenergy,
            entry.windgust,
            entry.windspeed,
          ]
        );
      }

      console.log("Данные успешно сохранены в БД!");
      res.json(weatherData);
    } catch (error) {
      console.error("Ошибка при получении данных о погоде:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  }
}

module.exports = new WeatherController();
