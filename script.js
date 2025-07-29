import gameData from "./data.js";

const gridContainer = document.getElementById("grid-container");

gameData.forEach((game) => {
const gameCard = `
     <a href=${game.link} class="card-link">
                    <article class="card">
                        <!-- TODO: Replace this div with an actual image: <img src="path/to/image1.png" alt="Crossy Road with React Three Fiber"> -->
                        <img
                            class="card-image-placeholder"
                            src=${game.imageLink}
                            alt=""
                        />
                        <div class="card-content">
                            <h2>${game.name}</h2>
                            <div class="tags">
                            ${game.tags.map((tag) => `<span>${tag}</span>`).join('')}
                            </div>
                        </div>
                    </article>
                </a>
    `;

  gridContainer.innerHTML += gameCard;
});
